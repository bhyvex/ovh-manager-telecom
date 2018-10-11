
import template from './chartjs.html';

export default /* @ngInject */ Chart => ({
  restrict: 'A',
  scope: {
    tucChartjs: '=?',
  },
  bindToController: true,
  controllerAs: '$ctrl',
  template,
  link(scope, element, attrs, controller) {
    const canvas = element.children().get(0);
    canvas.id = _.uniqueId('tucChartjs');
    _.set(controller, 'ctx', canvas.getContext('2d'));
  },
  controller: function directiveController($scope) {
    const self = this;

    this.createChart = function (data) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }
      this.chartInstance = new Chart(this.ctx, data || this.tucChartjs);
    };

    this.$onInit = function () {
      $scope.$watch('$ctrl.tucChartjs', (data) => {
        if (data) {
          self.createChart(data);
        }
      });

      $scope.$on('destroy', () => {
        if (self.chartInstance) {
          self.chartInstance.destroy();
        }
      });
    };
  },
});
