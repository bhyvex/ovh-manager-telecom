
angular.module('managerApp').run(($translate, asyncLoader) => {
  asyncLoader.addTranslations(import(`ovh-angular-line-diagnostics/src/ovh-angular-line-diagnostics/translations/Messages_${$translate.use()}.xml`).then(x => x.default));
  $translate.refresh();
});
