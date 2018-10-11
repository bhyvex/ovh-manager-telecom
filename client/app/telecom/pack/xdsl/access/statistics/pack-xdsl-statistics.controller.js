angular.module('managerApp').controller('XdslStatisticsCtrl', class XdslStatisticsCtrl {
  constructor(
    $filter, $q, $scope, $stateParams, $translate,
    ChartjsFactory, OvhApiXdsl,
    PACK_XDSL_STATISTICS, XDSL,
  ) {
    this.$filter = $filter;
    this.$q = $q;
    this.$scope = $scope;
    this.$stateParams = $stateParams;
    this.$translate = $translate;
    this.ChartjsFactory = ChartjsFactory;
    this.OvhApiXdsl = OvhApiXdsl;
    this.PACK_XDSL_STATISTICS = PACK_XDSL_STATISTICS;
    this.XDSL = XDSL;
  }

  $onInit() {
    this.charts = {};

    this.periodOptions = this.XDSL.statisticsPeriodEnum;

    this.synchronization = {
      period: 'preview',
    };
    this.traffic = {
      period: 'preview',
    };
    this.ping = {
      period: 'preview',
    };
    this.snr = {
      period: 'preview',
    };
    this.attenuation = {
      period: 'preview',
    };

    const PingStatsPromise = this.getPingStatistics(this.ping.period)
      .then(() => this.getTrafficStatistics(this.traffic.period));

    if (!this.$scope.access.xdsl.isFiber) {
      return this.$q.all([
        this.getSNRstatistics(this.snr.period)
          .then(() => this.getAttenuationStatistics(this.attenuation.period)
            .then(() => this.getSynchronizationStatistics(this.synchronization.period))),
        PingStatsPromise,
      ]);
    }

    return PingStatsPromise;
  }

  /**
   * Define the display string for a bitrate
   * @param {Number} bitrate Bitrate in bits per seconds
   * @return {String}
   */
  displayBitrate(bitrate) {
    return this.$filter('unit-humanize')(bitrate, 'bit', 1);
  }

  /**
   * Define the display string for ping value
   * @param {Number} pingrate Ping in milliseconds
   * @return {String}
   */
  displayPingrate(pingrate) {
    if (pingrate < 1000) {
      return this.$translate.instant('xdsl_statistics_ping_ms', { value: pingrate.toFixed(1) });
    }
    return this.$translate.instant('xdsl_statistics_ping_s', { value: (pingrate / 1000).toFixed(1) });
  }

  /**
   * Callback used to display Y scale
   * @param {String} label Current scale label
   * @param {Number} index Index of the current scale label
   * @param  {Array} all   All scale labels
   * @return {String} Label
   */
  logarithmicAxisDisplay(label, index, all) {
    const interval = Math.round(all.length / 4);
    if (index === all.length - 1 || index % interval === 0) {
      return this.$filter('unit-humanize')(label, 'generic', 1);
    }
    return '';
  }

  /**
   * Get the statistics of a line
   * @param {String} type   Some of :
   *          - snr:upload
   *          - snr:download,
   *          - attenuation:upload,
   *          - attenuation:download,
   *          - synchronization:upload,
   *          - synchronization:download
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {Promise} Promise that is always resolved
   */
  getLinesStatistics(type, period) {
    return this.OvhApiXdsl.Lines().v6().getStatistics({
      xdslId: this.$stateParams.serviceName,
      period,
      number: this.$stateParams.number,
      type,
    }).$promise.then((statistics) => {
      const datas = _.get(statistics, 'values') || [];
      return datas.map(data => [data.timestamp * 1000, data.value]);
    }).catch(() => []);
  }

  /**
   * Get the statistics of an access
   * @param {String} type   Some of :
   *          - ping
   *          - traffic:upload,
   *          - traffic:download,
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {Promise} Promise that is always resolved
   */
  getAccessStatistics(type, period) {
    return this.OvhApiXdsl.v6().statistics({
      xdslId: this.$stateParams.serviceName,
      period,
      type,
    }).$promise.then((statistics) => {
      const datas = statistics.values || [];
      return datas.map(data => [data.timestamp * 1000, data.value]);
    }).catch(() => []);
  }

  /**
   * Get synchronisatoin statistic for the line
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {promise}
   */
  getSynchronizationStatistics(period) {
    this.synchronization.loading = true;
    return this.$q.all({
      uploads: this.getLinesStatistics('synchronization:upload', period),
      downloads: this.getLinesStatistics('synchronization:download', period),
    }).then((stats) => {
      this.synchronization.haveSeries = !!(stats.uploads.length && stats.downloads.length);

      this.synchronization.chart = new this.ChartjsFactory(
        angular.copy(this.PACK_XDSL_STATISTICS.chart),
      );
      this.synchronization.chart.setAxisOptions('yAxes', {
        type: 'logarithmic',
        ticks: {
          callback: this.logarithmicAxisDisplay.bind(this),
        },
      });

      this.synchronization.chart.addSerie(
        this.$translate.instant('xdsl_statistics_download_label'),
        _.map(stats.downloads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      this.synchronization.chart.addSerie(
        this.$translate.instant('xdsl_statistics_upload_label'),
        _.map(stats.uploads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      if (!stats.downloads.length && !stats.uploads.length) {
        this.synchronization.chart.options.scales.xAxes = [];
      }

      this.synchronization.chart.setTooltipCallback(
        'label',
        item => this.displayBitrate(item.yLabel),
      );

      this.synchronization.chart.setYLabel(this.$translate.instant('xdsl_statistics_bits_per_sec_legend'));

      return this.synchronization.chart;
    }).finally(() => {
      this.synchronization.loading = false;
    });
  }


  /**
   * Get traffic statistic for the line
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {promise}
   */
  getTrafficStatistics(period) {
    this.traffic.loading = true;
    return this.$q.all({
      uploads: this.getAccessStatistics('traffic:upload', period),
      downloads: this.getAccessStatistics('traffic:download', period),
    }).then((stats) => {
      this.traffic.haveSeries = !!(stats.uploads.length && stats.downloads.length);

      this.traffic.chart = new this.ChartjsFactory(angular.copy(this.PACK_XDSL_STATISTICS.chart));

      this.traffic.chart.setAxisOptions('yAxes', {
        type: 'logarithmic',
        ticks: {
          callback: this.logarithmicAxisDisplay.bind(this),
        },
      });

      this.traffic.chart.addSerie(
        this.$translate.instant('xdsl_statistics_download_label'),
        _.map(stats.downloads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      this.traffic.chart.addSerie(
        this.$translate.instant('xdsl_statistics_upload_label'),
        _.map(stats.uploads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      if (!stats.downloads.length && !stats.uploads.length) {
        this.traffic.chart.options.scales.xAxes = [];
      }

      this.traffic.chart.setTooltipCallback(
        'label',
        item => this.displayBitrate(item.yLabel),
      );

      this.traffic.chart.setYLabel(this.$translate.instant('xdsl_statistics_bits_per_sec_legend'));

      return this.traffic.chart;
    }).finally(() => {
      this.traffic.loading = false;
    });
  }

  /**
   * Get ping statistic for the line
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {promise}
   */
  getPingStatistics(period) {
    this.ping.loading = true;
    return this.getAccessStatistics('ping', period).then((statistics) => {
      this.ping.haveSeries = !!statistics.length;

      this.ping.chart = new this.ChartjsFactory(angular.copy(this.PACK_XDSL_STATISTICS.chart));

      this.ping.chart.setAxisOptions('yAxes', {
        type: 'linear',
      });

      this.ping.chart.addSerie(
        this.$translate.instant('xdsl_statistics_ping_title'),
        _.map(statistics, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      if (!statistics.length) {
        this.ping.chart.options.scales.xAxes = [];
      }

      this.ping.chart.setTooltipCallback(
        'label',
        item => this.displayPingrate(item.yLabel),
      );

      this.ping.chart.setYLabel(this.$translate.instant('xdsl_statistics_millisecond_legend'));

      return this.ping.chart;
    }).finally(() => {
      this.ping.loading = false;
    });
  }

  /**
   * Get SNR statistic for the line
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {promise}
   */
  getSNRstatistics(period) {
    this.snr.loading = true;
    return this.$q.all({
      uploads: this.getLinesStatistics('snr:upload', period),
      downloads: this.getLinesStatistics('snr:download', period),
    }).then((stats) => {
      this.snr.haveSeries = !!(stats.uploads.length && stats.downloads.length);

      this.snr.chart = new this.ChartjsFactory(angular.copy(this.PACK_XDSL_STATISTICS.chart));

      this.snr.chart.setAxisOptions('yAxes', {
        type: 'linear',
      });

      this.snr.chart.addSerie(
        this.$translate.instant('xdsl_statistics_download_label'),
        _.map(stats.downloads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      this.snr.chart.addSerie(
        this.$translate.instant('xdsl_statistics_upload_label'),
        _.map(stats.uploads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      if (!stats.downloads.length && !stats.uploads.length) {
        this.snr.chart.options.scales.xAxes = [];
      }

      this.snr.chart.setTooltipCallback(
        'label',
        item => this.$translate.instant('xdsl_statistics_decibel', { value: item.yLabel.toFixed(1) }),
      );

      this.snr.chart.setYLabel(this.$translate.instant('xdsl_statistics_decibel_legend'));

      return this.snr.chart;
    }).finally(() => {
      this.snr.loading = false;
    });
  }

  /**
   * Get attenuation statistic for the line
   * @param {String} period Period to request :
   *          - daily
   *          - monthly
   *          - preview
   *          - weekly
   *          - yearly
   * @return {promise}
   */
  getAttenuationStatistics(period) {
    this.attenuation.loading = true;
    return this.$q.all({
      uploads: this.getLinesStatistics('attenuation:upload', period),
      downloads: this.getLinesStatistics('attenuation:download', period),
    }).then((stats) => {
      this.attenuation.haveSeries = !!(stats.uploads.length && stats.downloads.length);

      this.attenuation.chart = new this.ChartjsFactory(
        angular.copy(this.PACK_XDSL_STATISTICS.chart),
      );

      this.attenuation.chart.setAxisOptions('yAxes', {
        type: 'linear',
      });

      this.attenuation.chart.addSerie(
        this.$translate.instant('xdsl_statistics_download_label'),
        _.map(stats.downloads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      this.attenuation.chart.addSerie(
        this.$translate.instant('xdsl_statistics_upload_label'),
        _.map(stats.uploads, point => ({
          x: point[0],
          y: point[1],
        })),
        {
          dataset: {
            fill: true,
            borderWidth: 1,
          },
        },
      );

      if (!stats.downloads.length && !stats.uploads.length) {
        this.attenuation.chart.options.scales.xAxes = [];
      }

      this.attenuation.chart.setTooltipCallback(
        'label',
        item => this.$translate.instant('xdsl_statistics_decibel', { value: item.yLabel.toFixed(1) }),
      );

      this.attenuation.chart.setYLabel(this.$translate.instant('xdsl_statistics_decibel_legend'));

      return this.attenuation.chart;
    }).finally(() => {
      this.attenuation.loading = false;
    });
  }
});
