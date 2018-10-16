import angular from 'angular';

import tucChartjs from './chartjs';
import tucTelecomV4Links from './telecom/v4-links';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucTelecomV4Links,
    tucUnitHumanize,
  ])
  .name;
