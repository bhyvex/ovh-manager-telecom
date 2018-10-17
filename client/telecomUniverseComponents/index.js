import angular from 'angular';

import tucChartjs from './chartjs';
import tucCustomAsterisk from './custom-asterisk';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucCustomAsterisk,
    tucUnitHumanize,
  ])
  .name;
