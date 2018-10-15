angular.module('managerApp').controller('XdslAccessPortResetCtrl', function ($stateParams, $scope, $translate, OvhApiXdslLinesDslamPort, TucToast, ToastError) {
  this.resetDslam = function () {
    if (_.isEmpty($stateParams.serviceName) || _.isEmpty($stateParams.number)) {
      TucToast.error($translate.instant('xdsl_access_dslam_reset_an_error_ocurred'));
    }

    OvhApiXdslLinesDslamPort.v6().reset(
      {
        xdslId: $stateParams.serviceName,
        number: $stateParams.number,
      },
      null,
      (result) => {
        if (result.status === 'todo' || result.status === 'doing') {
          $scope.access.tasks.current[result.function] = true;
        }

        TucToast.success($translate.instant('xdsl_access_dslam_reset_success'));
      },
      err => new ToastError(err, 'xdsl_access_dslam_reset_an_error_ocurred'),
    );
  };
});
