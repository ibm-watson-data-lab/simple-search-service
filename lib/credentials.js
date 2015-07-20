var services = process.env.VCAP_SERVICES;
if (typeof services != 'undefined') {
  services = JSON.parse(services);
}
module.exports = services;