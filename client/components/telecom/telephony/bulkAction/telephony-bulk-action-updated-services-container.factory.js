angular.module("managerApp").factory("telephonyBulkActionUpdatedServicesContainer", function () {
    "use strict";

    var self = this;

    self._updatedServices = [];

    function clearUpdatedServices () {
        self._updatedServices = []
    }

    function storeUpdatedServices (data) {
        self._updatedServices = self._updatedServices.concat(data);
    }

    function getUpdatedServices () {
        return self._updatedServices;
    }

    return {
        clearUpdatedServices: clearUpdatedServices,
        getUpdatedServices: getUpdatedServices,
        storeUpdatedServices: storeUpdatedServices
    };
});
