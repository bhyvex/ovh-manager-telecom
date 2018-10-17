import angular from 'angular';

import tucChartjs from './chartjs';
import tucPhone from './phone';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucPhone,
    tucUnitHumanize,
  ])
  .name;
