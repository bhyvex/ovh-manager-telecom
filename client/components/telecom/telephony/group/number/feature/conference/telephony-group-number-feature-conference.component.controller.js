angular.module('managerApp').controller('TelephonyNumberConferenceCtrl', function ($q, $translate, TelephonyMediator, telephonyGroupNumberConferencePolling, Toast, ToastError) {
  const self = this;

  const settingsAttributes = ['language', 'pin', 'announceFile',
    'recordStatus', 'enterMuted', 'anonymousRejection',
    'reportStatus', 'reportEmail', 'whiteLabelReport',
  ];

  self.loading = {
    webAccess: false,
    announceUpload: false,
  };

  self.availableLanguages = [];

  self.availableReportStatus = [
    {
      value: 'none',
      label: $translate.instant('telephony_number_feature_conference_report_status_none'),
    }, {
      value: 'customer',
      label: $translate.instant('telephony_number_feature_conference_report_status_customer'),
    }, {
      value: 'other',
      label: $translate.instant('telephony_number_feature_conference_report_status_other'),
    },
  ];

  self.model = {
    lockState: null,
    muteAllState: null,
  };

  self.status = {
    move: null,
    toShow: null, // can be 'webAccess', 'announcement' or 'report'
  };

  self.popoverOpen = false;

  /*= =============================
    =            HELPERS            =
    ============================== */

  function getConferenceEnums() {
    return TelephonyMediator.getApiModelEnum('telephony.ConferenceLanguageEnum').then((availableLanguages) => {
      // populate language list
      self.availableLanguages = _.map(availableLanguages, languageKey => ({
        value: languageKey,
        label: $translate.instant(`language_${languageKey}_${languageKey !== 'en' ? languageKey.toUpperCase() : 'GB'}`),
      }));
    });
  }

  function saveFeature() {
    return self.numberCtrl.number.feature.save().then(() => {
      self.numberCtrl.jsplumbInstance.customRepaint();
      self.numberCtrl.number.feature.stopEdition();
    }).catch((error) => {
      self.numberCtrl.number.feature.stopEdition(true);
      Toast.error([$translate.instant('telephony_number_feature_conference_save_error'), (error.data && error.data.message) || ''].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.numberCtrl.loading.save = false;
    });
  }

  self.connectedSince = function (participant) {
    return moment.duration(moment().diff(moment(participant.arrivalDateTime))).humanize();
  };

  /* -----  End of HELPERS  ------*/

  /*= =============================
    =            ACTIONS            =
    ============================== */

  self.generateWebAccess = function () {
    self.loading.webAccess = true;
    return self.numberCtrl.number.feature
      .generateWebAccess()
      .catch(err => new ToastError(err))
      .finally(() => {
        self.loading.webAccess = false;
      });
  };

  self.regenerateWebAccess = function () {
    return self.numberCtrl.number.feature.deleteWebAccess().then(() => self.generateWebAccess());
  };

  /* -----  End of ACTIONS  ------*/

  /*= ===========================================
    =            PARTICIPANTS ACTIONS            =
    ============================================ */

  self.kickParticipant = function (participant) {
    return participant.kick();
  };

  self.toggleDeafParticipant = function (participant) {
    return $q.when(true).then(() => (participant.hear ? participant.deaf() : participant.undeaf()));
  };

  self.manageSoundParticipant = function (participant) {
    const promise = [].concat(participant.energyEquivalence === 0
      ? participant.mute() : participant.unmute());
    let energy = null;

    switch (participant.energyEquivalence) {
      case 0:
      case 1:
        energy = 450;
        break;
      case 3:
        energy = 150;
        break;
      case 4:
        energy = 0;
        break;
      default:
        energy = 300; // because default energy is 300 (equivalence of 2)
    }

    promise.push(participant.updateEnergy(energy));
    return $q.allSettled(promise);
  };

  /* -----  End of PARTICIPANTS ACTIONS  ------*/

  /*= =============================
    =            EVENTS            =
    ============================== */

  /**
     *  Called on config button clicked.
     */
  self.togglePopover = function () {
    self.popoverOpen = !self.popoverOpen;
    if (self.popoverOpen) {
      self.numberCtrl.number.feature.startEdition();
      _.assign(self, _.pick(self.numberCtrl.number.feature, settingsAttributes));
    } else {
      self.numberCtrl.number.feature.stopEdition(true);
      self.status.move = null;
    }
  };

  /**
   *  Called when submit is clicked. Configuration is OK,
   *  so we start to save the conference feature.
   */
  self.onPopoverValidate = function () {
    self.popoverOpen = false;
    return self.numberCtrl.saveNumber();
  };

  /**
   *  Called when cancel button is clicked.
   *  We stop feature configuration and rollback to previous configuration.
   */
  self.onPopoverCancel = function () {
    self.popoverOpen = false;
    self.numberCtrl.number.feature.stopEdition(true);
  };

  self.onSoundFileChoosed = function (file) {
    const validExtensions = ['wav', 'mp3', 'ogg'];
    const fileName = file ? file.name : '';
    const found = _.some(validExtensions, ext => _.endsWith(fileName.toLowerCase(), ext));

    if (!found) {
      return new ToastError($translate.instant('telephony_number_feature_conference_announcement_file_invalid'));
    }

    self.loading.announceUpload = true;
    return self.numberCtrl.number.feature
      .announceUpload(file)
      .then(() => self.numberCtrl.number.feature.getSettings()).finally(() => {
        self.loading.announceUpload = false;
      });
  };

  self.setLockStatus = function (newValue) {
    self.model.lockState = newValue;
  };

  self.toggleLockStatus = function () {
    return $q.when(true)
      .then(() => (self.model.lockState
        ? self.numberCtrl.number.feature.lock() : self.numberCtrl.number.feature.unlock()));
  };

  self.setMuteAll = function (newValue) {
    self.model.muteAllState = newValue;
  };

  self.toggleMuteAll = function () {
    return $q.when(true)
      .then(() => (self.model.muteAllState
        ? self.numberCtrl.number.feature.muteAllParticipants()
        : self.numberCtrl.number.feature.unmuteAllParticipants()));
  };

  /* -----  End of EVENTS  ------*/

  /*= =====================================
  =            INITIALIZATION            =
  ====================================== */

  /**
   *  Component initialization
   */
  self.$onInit = function () {
    let participantCount = 0;

    // set save feature function
    self.numberCtrl.saveFeature = saveFeature;

    // load resource needed for conference
    self.numberCtrl.loading.feature = true;
    return $q.all([
      self.numberCtrl.number.feature.init(),
      self.numberCtrl.number.feature.getSettings(),
      self.numberCtrl.number.feature.getWebAccess(),
      getConferenceEnums(),
    ]).then(() => {
      _.assign(self, _.pick(self.numberCtrl.number.feature, settingsAttributes));
      telephonyGroupNumberConferencePolling
        .initPolling(self.numberCtrl.number.feature).then(angular.noop, (error) => {
          if (error) {
            Toast.error([$translate.instant('telephony_number_feature_conference_refresh_error'), (error.data && error.data.message) || ''].join(' '));
          }
          return $q.reject(error);
        }, () => {
          if (self.numberCtrl.number.feature.participants.length
            && self.numberCtrl.number.feature.participants.length !== participantCount) {
            self.numberCtrl.jsplumbInstance.customRepaint();
            participantCount = self.numberCtrl.number.feature.participants.length;
          }
        });
    }).catch((error) => {
      Toast.error([$translate.instant('telephony_number_feature_conference_load_error'), (error.data && error.data.message) || ''].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.numberCtrl.loading.feature = false;
    });
  };

  /**
   *  Stop feature edition and polling when component is destroyed.
   */
  self.$onDestroy = function () {
    // stop edition of the feature
    self.numberCtrl.number.feature.stopEdition(true);

    // stop conference polling
    telephonyGroupNumberConferencePolling.stopPolling();
  };

  /* -----  End of INITIALIZATION  ------*/
});
