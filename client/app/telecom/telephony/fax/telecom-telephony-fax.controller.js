angular.module('managerApp').controller('TelecomTelephonyFaxCtrl', function ($q, $stateParams, $translate, atInternet, TelecomMediator, TelephonyMediator, SidebarMenu, Toast) {
  const self = this;

  self.loading = {
    init: false,
  };

  self.fax = null;
  self.actions = null;
  self.terminationTask = null;

  /* ===============================
    =            ACTIONS            =
    =============================== */

  self.faxNameSave = function (newServiceDescription) {
    self.fax.startEdition();
    self.fax.description = newServiceDescription;
    return self.fax.save().then(() => {
      self.fax.stopEdition();
      SidebarMenu.updateItemDisplay({
        title: self.fax.getDisplayedName(),
      }, self.fax.serviceName, 'telecom-telephony-section', self.fax.billingAccount);
    }, (error) => {
      self.fax.stopEdition(true);
      Toast.error([$translate.instant('telephony_fax_rename_error', $stateParams), error.data.message].join(' '));
      return $q.reject(error);
    });
  };

  /* -----  End of ACTIONS  ------ */

  /* =====================================
    =            INITIALIZATION            =
    ====================================== */

  self.$onInit = function () {
    self.loading.init = true;

    return TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.fax = group.getFax($stateParams.serviceName);

      return self.fax.getTerminationTask().then((task) => {
        self.terminationTask = task;
      });
    }).finally(() => {
      self.loading.init = false;

      atInternet.trackPage({
        name: 'Fax',
        type: 'navigation',
        level2: 'Telecom',
        chapter: 'telecom',
      });
    });
  };

  /* -----  End of INITIALIZATION  ------ */
});
