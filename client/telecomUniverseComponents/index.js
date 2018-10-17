import angular from 'angular';

import tucChartjs from './chartjs';
import tucSectionBackLink from './section-back-link';
import tucUnitHumanize from './unit/humanize';

export default angular
  .module('telecomUniverseComponents', [
    tucChartjs,
    tucSectionBackLink,
    tucUnitHumanize,
  ])
  .name;
