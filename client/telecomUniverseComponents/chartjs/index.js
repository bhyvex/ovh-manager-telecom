import angular from 'angular';


import { TUC_CHARTJS } from './chartjs.constant';


import tucChartjsDirective from './chartjs.directive';

import TucChartjsFactory from './chartjs.factory';


export default angular
  .module('tucChartjs', [])

  .constant('TUC_CHARTJS', TUC_CHARTJS)


  .directive('tucChartjs', tucChartjsDirective)

  .factory('TucChartjsFactory', TucChartjsFactory)


  .name;
