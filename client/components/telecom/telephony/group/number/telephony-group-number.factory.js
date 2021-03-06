angular.module('managerApp').factory('TelephonyGroupNumber', ($q, $injector, OvhApiTelephony, voipServiceTask) => {
  /*= ==================================
    =            CONSTRUCTOR            =
    =================================== */

  function TelephonyGroupNumber(optionsParam) {
    let options = optionsParam;

    if (!options) {
      options = {};
    }

    // options check
    if (!options.billingAccount) {
      throw new Error('billingAccount option must be specified when creating a new TelephonyGroupNumber');
    }

    if (!options.serviceName) {
      throw new Error('serviceName option must be specified when creating a new TelephonyGroupNumber');
    }

    // mandatory
    this.billingAccount = options.billingAccount;
    this.serviceName = options.serviceName;

    // from API
    this.serviceType = options.serviceType;
    this.description = options.description;
    this.partOfPool = options.partOfPool;

    // custom attributes
    this.inEdition = false;
    this.saveForEdition = null;

    this.feature = this.getFeature(options.featureType);
  }

  /* -----  End of CONSTRUCTOR  ------*/

  /*= ========================================
    =            PROTOTYPE METHODS            =
    ========================================= */

  TelephonyGroupNumber.prototype.getDisplayedName = function () {
    const self = this;

    return self.description || self.serviceName;
  };

  /* ----------  API CALLS  ----------*/

  TelephonyGroupNumber.prototype.save = function () {
    const self = this;
    const savePromises = [];

    if (self.hasChange('description')) {
      savePromises.push(OvhApiTelephony.Number().v6().edit({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
      }, {
        description: self.description,
      }).$promise);
    }

    return $q.allSettled(savePromises);
  };

  /* ----------  FEATURE  ----------*/

  TelephonyGroupNumber.prototype.getFeature = function (featureType, refresh) {
    const self = this;

    if (self.feature && !refresh) {
      return self.feature;
    }

    const FeatureTypeFactory = $injector.get(`TelephonyGroupNumber${_.capitalize(self.getFeatureFamily(featureType))}`);

    return new FeatureTypeFactory({
      billingAccount: self.billingAccount,
      serviceName: self.serviceName,
      featureType,
    });
  };

  TelephonyGroupNumber.prototype.getFeatureFamily = function (featureTypeParam) {
    const self = this;
    let featureType = featureTypeParam;

    if (!featureType && self.feature) {
      featureType = self.feature.featureType; // eslint-disable-line
    }

    switch (featureType) {
      case 'redirect':
      case 'ddi':
        return 'redirect';
      case 'conference':
        return 'conference';
      case 'cloudIvr':
      case 'cloudHunting':
      case 'contactCenterSolutionExpert':
        return 'ovhPabx';
      case 'svi':
        return 'svi';
      case 'easyHunting':
      case 'contactCenterSolution':
        return 'easyHunting';
      case 'easyPabx':
        return 'easyPabx';
      case 'miniPabx':
        return 'miniPabx';
      default:
        return 'feature';
    }
  };

  TelephonyGroupNumber.prototype.changeFeatureType = function () {
    const self = this;

    return OvhApiTelephony.Number().v6()
      .changeFeatureType({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
      }, {
        featureType: self.feature.featureType,
      }).$promise
      .then(task => voipServiceTask
        .startPolling(
          self.billingAccount,
          self.serviceName,
          task.taskId,
          {
            namespace: `numberChangeTypeTask_${self.serviceName}`,
            interval: 1000,
            retryMaxAttempts: 0,
          },
        )
        .then(() => {
          self.feature = self.getFeature(self.feature.featureType, true);
          return self.feature.init(true).then(() => self);
        }));
  };

  /* ----------  TASK  ----------*/

  TelephonyGroupNumber.prototype.getTerminationTask = function () {
    const self = this;
    return OvhApiTelephony.Service().OfferTask().v6()
      .query({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
        action: 'termination',
        type: 'offer',
      }).$promise
      .then(offerTaskIds => $q
        .all(_.map(offerTaskIds, id => OvhApiTelephony.Service().OfferTask().v6().get({
          billingAccount: self.billingAccount,
          serviceName: self.serviceName,
          taskId: id,
        }).$promise))
        .then(tasks => _.head(_.filter(tasks, { status: 'todo' }))));
  };

  TelephonyGroupNumber.prototype.getConvertToLineTask = function () {
    const self = this;
    return OvhApiTelephony.Service().OfferTask().v6()
      .query({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
        action: 'convertToSip',
        type: 'offer',
      }).$promise
      .then(offerTaskIds => $q
        .all(_.map(offerTaskIds, id => OvhApiTelephony.Service().OfferTask().v6().get({
          billingAccount: self.billingAccount,
          serviceName: self.serviceName,
          taskId: id,
        }).$promise)).then(tasks => _.head(_.filter(tasks, { status: 'todo' }))));
  };

  /* ----------  EDITION  ----------*/

  TelephonyGroupNumber.prototype.startEdition = function (startFeatureEdition) {
    const self = this;

    self.inEdition = true;

    self.saveForEdition = {
      description: angular.copy(self.description),
    };

    if (startFeatureEdition) {
      self.feature.startEdition();
    }

    return self;
  };

  TelephonyGroupNumber.prototype.isSpecialNumber = function () {
    const self = this;
    return OvhApiTelephony.Rsva().v6().getCurrentRateCode({
      billingAccount: self.billingAccount,
      serviceName: self.serviceName,
    }).$promise.then(() => $q.when(true))
      .catch(() => $q.when(false));
  };

  TelephonyGroupNumber.prototype.stopEdition = function (cancel, stopFeatureEdition) {
    const self = this;

    if (self.saveForEdition && cancel) {
      self.description = angular.copy(self.saveForEdition.description);
    }

    self.saveForEdition = null;
    self.inEdition = false;

    if (stopFeatureEdition) {
      self.feature.stopEdition(cancel);
    }

    return self;
  };

  TelephonyGroupNumber.prototype.hasChange = function (attr) {
    const self = this;

    if (!self.inEdition || !self.saveForEdition) {
      return false;
    }

    if (attr) {
      switch (attr) {
        case 'description':
          return !_.isEqual(self.saveForEdition.description, self.description);
        case 'feature':
          return self.feature.hasChange();
        default:
          return false;
      }
    } else {
      return self.hasChange('description') || self.hasChange('feature');
    }
  };

  /* -----  End of PROTOTYPE METHODS  ------*/

  return TelephonyGroupNumber;
});
