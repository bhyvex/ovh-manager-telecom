angular.module('managerApp').controller('TelecomTelephonyAliasDashboardController', class TelecomTelephonyAliasHomeController {
  constructor(
    $state, $stateParams, $translate, $uibModal,
    ChartjsFactory, OvhApiTelephony, Toast,
    voipService,
    TELEPHONY_ALIAS_CONSUMPTION,
  ) {
    this.$state = $state;
    this.$translate = $translate;
    this.$uibModal = $uibModal;
    this.ChartjsFactory = ChartjsFactory;
    this.OvhApiTelephony = OvhApiTelephony;
    this.Toast = Toast;
    this.voipService = voipService;

    this.TELEPHONY_ALIAS_CONSUMPTION = TELEPHONY_ALIAS_CONSUMPTION;

    this.billingAccount = $stateParams.billingAccount;
    this.serviceName = $stateParams.serviceName !== 'default' ? $stateParams.serviceName : null;
  }

  $onInit() {
    this.alias = null;
    this.consumption = {
      incoming: {},
      outgoing: {},
      chart: new this.ChartjsFactory(
        angular.copy(this.TELEPHONY_ALIAS_CONSUMPTION.chart),
      ),
    };

    this.fetchService();
  }

  fetchService() {
    this.loading = true;
    this.voipService.fetchSingleService(this.billingAccount, this.serviceName).then((alias) => {
      if (alias) {
        this.alias = alias;
        this.featureTypeLabel = this.$translate.instant(`telephony_alias_configuration_configuration_type_${this.alias.featureType}`);

        return this.voipService.getServiceDirectory(alias).then((result) => {
          this.alias.directory = result.directory;

          return this.hasConsumption() ? this.fetchServiceConsumption() : result;
        });
      }
      return null;
    }).catch((error) => {
      this.Toast.error([this.$translate.instant('telephony_alias_load_error'), _.get(error, 'data.message')].join(' '));
    }).finally(() => {
      this.loading = false;
    });
  }

  fetchServiceConsumption() {
    function transformIncomingCallsData(calls) {
      return calls.filter(call => call.wayType !== 'outgoing')
        .map((call) => {
          _.set(call, 'durationAsDate', new Date(call.duration * 1000));
          return call;
        });
    }

    function transformOutgoingCallsData(calls) {
      return calls.filter(call => call.wayType !== 'incoming' && call.duration > 0)
        .map((call) => {
          _.set(call, 'durationAsDate', new Date(call.duration * 1000));
          return call;
        });
    }

    return this.voipService.getServiceConsumption(this.alias)
      .then((conso) => {
        const incomingCalls = transformIncomingCallsData(conso);
        const outgoingCalls = transformOutgoingCallsData(conso);

        this.consumption.incoming = {
          total: incomingCalls.length,
          duration: new Date(_.sum(incomingCalls, call => call.duration) * 1000),
        };

        this.consumption.outgoing = {
          total: outgoingCalls.length,
          duration: new Date(_.sum(outgoingCalls, call => call.duration) * 1000),
          outplan: _.round(_.sum(
            outgoingCalls.filter(call => call.planType === 'outplan' && call.priceWithoutTax),
            call => call.priceWithoutTax.value,
          ), 2),
        };

        this.buildConsumptionChart(incomingCalls, outgoingCalls);
      });
  }

  buildConsumptionChart(incomingCalls, outgoingCalls) {
    const datasetConfiguration = {
      dataset: {
        fill: true,
        borderWidth: 1,
      },
    };

    const _incomingCalls = incomingCalls.map(call => (
      { callDate: moment(call.creationDatetime).format('YYYY-MM-DD').toString() }
    ));

    const _outgoingCalls = outgoingCalls.map(call => (
      { callDate: moment(call.creationDatetime).format('YYYY-MM-DD').toString() }
    ));

    const xAxisKeys = _.chain(_incomingCalls)
      .union(_outgoingCalls)
      .sortBy('callDate')
      .groupBy('callDate')
      .keys()
      .value();

    function convertCallsToChartData(calls) {
      const groupedCalls = _.groupBy(calls, 'callDate');

      return xAxisKeys.map(key => ({
        x: key,
        y: groupedCalls[key] ? groupedCalls[key].length : 0,
      }));
    }

    if (_.isEmpty(xAxisKeys)) {
      this.consumption.chart.options.scales.xAxes = [];
    } else {
      this.consumption.chart.addSerie(
        this.$translate.instant('telephony_alias_consumption_outgoing_calls'),
        convertCallsToChartData(_outgoingCalls), datasetConfiguration,
      );

      this.consumption.chart.addSerie(
        this.$translate.instant('telephony_alias_consumption_incoming_calls'),
        convertCallsToChartData(_incomingCalls), datasetConfiguration,
      );
    }
  }

  deleteConfiguration() {
    this.$uibModal.open({
      templateUrl: 'app/telecom/telephony/alias/dashboard/confirmDeleteConfiguration/confirmDeleteConfiguration.modal.html',
      controller: 'TelecomTelephonyAliasConfirmDeleteConfigurationCtrl',
      controllerAs: '$ctrl',
      backdrop: 'static',
      resolve: {
        number: this.alias,
      },
    }).result.then(() => {
      this.OvhApiTelephony.Service().v6().resetCache();
      this.$state.reload();
      this.Toast.success(this.$translate.instant('telephony_alias_delete_ok'));
    }).catch((error) => {
      if (error) {
        this.Toast.error(
          `${this.$translate.instant('telephony_alias_delete_ko')} ${_.get(error, 'data.message', error.message)}`,
        );
      }
    });
  }

  groupNumberByFeatureType() {
    switch (this.alias.featureType) {
      case 'contactCenterSolution':
      case 'esayHunting':
      case 'miniPabx':
        return 'easyHunting';
      case 'ddi':
      case 'easyPabx':
      case 'redirect':
        return 'redirect';
      default:
        return this.alias.featureType;
    }
  }

  hasConsumption() {
    const typesWithoutConsumption = ['redirect', 'ddi', 'conference', 'empty'];
    return !typesWithoutConsumption.includes(this.alias.featureType);
  }

  hasExpertMode() {
    const expertTypes = ['svi', 'contactCenterSolutionExpert', 'cloudHunting'];
    return expertTypes.includes(this.alias.featureType);
  }
});