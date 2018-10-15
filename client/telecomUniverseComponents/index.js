import angular from 'angular';

import tucToaster from './toaster';
import tucToastError from './toast-error';

export default angular
  .module('telecomUniverseComponents', [
    tucToaster,
    tucToastError,
  ])
  .name;
