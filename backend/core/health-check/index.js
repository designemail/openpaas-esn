const registry = require('./registry');
const { buildHealthyMessage, buildUnhealthyMessage, buildNotFoundMessage } = require('./utils');
const Q = require('q');
const HealthCheckMessage = require('./HealthCheckMessage');
const HealthCheckProvider = require('./HealthCheckProvider');

module.exports = {
  checkWithCause,
  check,
  registry,
  HealthCheckProvider,
  HealthCheckMessage,
  buildHealthyMessage,
  buildUnhealthyMessage
};

/**
 * Check for all services in serviceNames. If serviceNames has no element returns all services.
 * If service not found, returns formatted message with status not found
 * @param {array} serviceNames
 */
function checkWithCause(serviceNames = []) {
  let checkers = registry.getAllCheckers();
  let availableServices = registry.getAllServiceNames();
  let unavailableServices = [];
  if (serviceNames.length) {
    checkers = registry.getCheckers(serviceNames);
    availableServices = serviceNames.filter(name => registry.checkAvailable(name));
    unavailableServices = serviceNames.filter(name => !registry.checkAvailable(name));
  }

  return Q.allSettled(checkers.map(checker => checker()))
    .then(results => results.map((result, index) => {
      if (result.state === 'fulfilled') {
        return result.value;
      }

      return buildUnhealthyMessage(availableServices[index], result.value || 'Error: Checker promise cannot be fulfilled');
    }))
    .then(results => [
      ...results,
      ...unavailableServices.map(serviceName => buildNotFoundMessage(serviceName))
    ]);
}

/**
 * Check for all services, but returns no cause
 * @param {array} serviceNames
 */
function check(serviceNames = []) {
  return checkWithCause(serviceNames)
    .then(results => results.map(result => {
      result.cause = null;
      return result;
    }));
}
