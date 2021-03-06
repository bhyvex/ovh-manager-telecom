angular.module('managerApp').controller('TelecomTelephonyLineCallsDisplayNumberCtrl', function ($scope, $stateParams, $translate, $timeout, OvhApiTelephonyLineOptions, Toast, ToastError, telephonyBulk) {
  const self = this;

  function getLineOptions() {
    return OvhApiTelephonyLineOptions.v6().get({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise.then((options) => {
      self.options = _.isObject(options) ? options : {};
      return options;
    }, () => new ToastError($translate.instant('telephony_line_actions_line_calls_display_number_read_error')));
  }

  function init() {
    self.isLoading = true;
    self.form = {
      identificationRestriction: undefined,
      displayedService: undefined,
    };

    $scope.$watch('LineDisplayNumberCtrl.form.identificationRestriction', () => {
      if (self.form.identificationRestriction) {
        self.form.displayedService = angular.copy(self.displayedService);
      }
    });

    return getLineOptions().then((options) => {
      self.identificationRestriction = _.get(options, 'identificationRestriction');
      self.form.identificationRestriction = self.identificationRestriction;
      self.displayedService = options.displayNumber;
      self.form.displayedService = angular.copy(self.displayedService);
    }).catch(err => new ToastError(err)).finally(() => {
      self.isLoading = false;
    });
  }

  self.onChooseService = function (service) {
    self.form.displayedService = service.serviceName;
  };

  self.hasChanges = function () {
    return !angular.equals(self.displayedService, self.form.displayedService)
               || self.identificationRestriction !== self.form.identificationRestriction;
  };

  self.reset = function () {
    // $timeout is here so flat-checkbox is corretly refreshed ...
    $timeout(() => {
      self.form.displayedService = angular.copy(self.displayedService);
      self.form.identificationRestriction = self.identificationRestriction;
    });
  };

  self.update = function () {
    const data = {
      identificationRestriction: self.form.identificationRestriction,
    };

    if (!data.identificationRestriction && self.form.displayedService) {
      data.displayNumber = self.form.displayedService;
    }

    self.isUpdating = true;
    return OvhApiTelephonyLineOptions.v6().update({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }, data).$promise.then(() => {
      self.identificationRestriction = self.form.identificationRestriction;
      self.displayedService = angular.copy(self.form.displayedService);
      Toast.success($translate.instant('telephony_line_actions_line_calls_display_number_write_success'));
    }, () => new ToastError($translate.instant('telephony_line_actions_line_calls_display_number_write_error'))).finally(() => {
      self.isUpdating = false;
    });
  };

  /* ===========================
    =            BULK            =
    ============================ */

  self.bulkDatas = {
    billingAccount: $stateParams.billingAccount,
    serviceName: $stateParams.serviceName,
    infos: {
      name: 'displayNumber',
      actions: [{
        name: 'options',
        route: '/telephony/{billingAccount}/line/{serviceName}/options',
        method: 'PUT',
        params: null,
      }],
    },
  };

  self.filterServices = function (services) {
    return _.filter(services, service => ['sip', 'mgcp'].indexOf(service.featureType) > -1);
  };

  self.getBulkParams = function () {
    const data = {
      identificationRestriction: self.form.identificationRestriction,
    };

    if (!data.identificationRestriction && self.form.displayedService) {
      data.displayNumber = self.form.displayedService;
    }

    return data;
  };

  self.onBulkSuccess = function (bulkResult) {
    // display message of success or error
    telephonyBulk.getToastInfos(bulkResult, {
      fullSuccess: $translate.instant('telephony_line_actions_line_calls_display_number_bulk_all_success'),
      partialSuccess: $translate.instant('telephony_line_actions_line_calls_display_number_bulk_some_success', {
        count: bulkResult.success.length,
      }),
      error: $translate.instant('telephony_line_actions_line_calls_display_number_bulk_error'),
    }).forEach((toastInfo) => {
      Toast[toastInfo.type](toastInfo.message, {
        hideAfter: null,
      });
    });

    // reset initial values to be able to modify again the options
    OvhApiTelephonyLineOptions.resetCache();
    init();
  };

  self.onBulkError = function (error) {
    Toast.error([$translate.instant('telephony_line_actions_line_calls_display_number_bulk_on_error'), _.get(error, 'msg.data')].join(' '));
  };

  /* -----  End of BULK  ------ */

  init();
});
