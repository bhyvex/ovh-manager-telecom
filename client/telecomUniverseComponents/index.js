import angular from 'angular';

import tucChartjs from './chartjs';
import tucFilters from './filters';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucFilters,
    tucUnitHumanize,
  ])
  .name;
