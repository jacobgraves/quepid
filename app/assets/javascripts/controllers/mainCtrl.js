'use strict';

angular.module('QuepidApp')
  // there's a lot of dependencies here, but this guy
  // is responsible for bootstrapping everyone so...
  .controller('MainCtrl', [
    '$scope', '$routeParams', '$location', '$rootScope', '$log',
    'flash',
    'caseSvc', 'settingsSvc', 'querySnapshotSvc', 'caseTryNavSvc',
    'queryViewSvc', 'queriesSvc', 'docCacheSvc', 'diffResultsSvc', 'customScorerSvc',
    'paneSvc',
    function (
      $scope, $routeParams, $location, $rootScope, $log,
      flash,
      caseSvc, settingsSvc, querySnapshotSvc, caseTryNavSvc,
      queryViewSvc, queriesSvc, docCacheSvc, diffResultsSvc, customScorerSvc,
      paneSvc
    ) {
      $log.debug('NEW MAIN CTRL');

      var caseNo  = parseInt($routeParams.caseNo, 10);
      var tryNo   = parseInt($routeParams.tryNo, 10);

      $log.debug("Caseno:" + caseNo + ", tryNo:" + tryNo);

      var initialCaseNo = angular.copy(caseTryNavSvc.getCaseNo());

      $log.debug(caseTryNavSvc.getTryNo());

      var curate = ($location.path().indexOf('curate') > 0);
      var curateSearch = null;
      if (curate && $location.search().hasOwnProperty('search')) {
        curateSearch = $location.search().search;
      }

      var caseChanged = function() {
        return initialCaseNo !== caseNo;
      };

      var getSearchEngine = function(tryNo) {
        var sett = settingsSvc.editableSettings();
        if (sett.hasOwnProperty('getTry')) {
          var aTry = sett.getTry(tryNo);
          if (aTry) {
            return aTry.searchUrl;
          }
        }
        return null;
      };

      var searchEngineChanged = function() {
        return getSearchEngine(caseTryNavSvc.getTryNo()) !== getSearchEngine(tryNo);
      };

      var init = function() {
        // Make sure we empty stuff from the previous case
        if ( caseChanged() ) {
          queriesSvc.reset();
        }

        angular.forEach(queriesSvc.queries, function(query) {
          query.reset();
        });
      };

      var bootstrapCase = function() {
        return caseSvc.get(caseNo)
          .then(function(acase) {
            caseSvc.selectTheCase(acase);
            settingsSvc.setCaseTries(acase.tries);
            if ( isNaN(tryNo) ) {  // If we didn't specify a try
              console.log("Setting tryNo to be " + acase.lastTry);
              tryNo = acase.lastTry;
            }

            settingsSvc.setCurrentTry(tryNo);
          });
      };

      var loadQueries = function() {
        var newSettings = settingsSvc.editableSettings();
        if ( caseChanged() || searchEngineChanged() ) {
          if ( caseChanged() ) {
            queryViewSvc.reset();
            docCacheSvc.empty();
            customScorerSvc.bootstrap(caseNo);
          }
          diffResultsSvc.setDiffSetting(null);
          docCacheSvc.invalidate();
        }

        return docCacheSvc.update(newSettings)
          .then(function() {
            var bootstrapped = false;

            return queriesSvc.changeSettings(caseNo, newSettings)
              .then(function() {
                if (!bootstrapped && !curate) {
                  flash.error                    = '';
                  flash.success                  = '';
                  flash.to('search-error').error = '';

                  bootstrapped = true;
                  return queriesSvc.searchAll()
                    .then(function() {
                      flash.success = 'All queries finished successfully!';
                    }, function(errorMsg) {
                      var mainErrorMsg = 'Some queries failed to resolve!';

                      flash.error = mainErrorMsg;
                      flash.to('search-error').error = errorMsg;
                    });
                }
              });
          });
      };

      var loadSnapshots = function() {
        return querySnapshotSvc.bootstrap(caseNo);
      };

      var updateCaseMetadata = function() {
        caseSvc.trackLastViewedAt(caseNo);
        caseSvc.fetchDropdownCases();
      };

      init();

      caseTryNavSvc.navigationCompleted({
        caseNo:       caseNo,
        tryNo:        tryNo,
        curate:       curate,
        curateSearch: curateSearch
      });

      queriesSvc.querySearchPromiseReset();

      bootstrapCase()
        .then(function() {
          loadQueries();
          loadSnapshots();
          updateCaseMetadata();
        });

      // Sets up the panes stuff only when needed
      paneSvc.initPanes();
      // Makes sure state is persisted even after reload.
      // This is used when the user hits "Rerun My Searches!" and wants to
      // continue tweaking the settings, it would keep the pane open.
      $rootScope.devSettings = $rootScope.devSettings || false;

      if ( $rootScope.devSettings ) {
        $(document).trigger('toggleEast');
      }

      $scope.toggleDevSettings = function() {
        $rootScope.devSettings = !$rootScope.devSettings;
        $(document).trigger('toggleEast');
      };
    }
  ]);
