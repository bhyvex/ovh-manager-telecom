import angular from 'angular';

import tucChartjs from './chartjs';
import tucTelecomPack from './telecom/pack';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucTelecomPack,
    tucUnitHumanize,
  ])
  .name;
