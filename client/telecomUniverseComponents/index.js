import angular from 'angular';

import tucChartjs from './chartjs';
import tucHideOutsideClick from './hideOutsideClick';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucHideOutsideClick,
    tucUnitHumanize,
  ])
  .name;
