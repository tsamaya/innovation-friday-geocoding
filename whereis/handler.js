require("dotenv").config();
const axios = require("axios");

/**
 * Third party API
 */

const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const UNKNOWN_LOCATION = "Unknown location";

const geocodeGoogle = async params =>
  axios.get(GOOGLE_GEOCODE_URL, {
    params
  });

/**
 * return a bad request (HTTP 400) response withe the given mmessage
 * @param  {Object}   data  error object
 */
const badRequest = data => {
  console.warn("bad request:", data);
  return {
    statusCode: 400,
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
    },
    body: JSON.stringify({
      error: 400,
      message: data
    })
  };
};

/**
 * return function result
 * @param  {Object}   data     where is result as an JSON
 */
const success = data => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
    },
    body: JSON.stringify(data)
  };
};

/**
 * parse Google Address Components using only
 * sublocality_level_1, postal_town, administrative_area_level_1 and country
 *
 * @param  {Object} addressComponents [description]
 * @return {String}                   [description]
 */
const parseGoogleAddressComponents = addressComponents => {
  let location = UNKNOWN_LOCATION;
  if (Array.isArray(addressComponents)) {
    // empty location for concatenate components
    location = "";
    addressComponents.forEach(component => {
      const addressTypes = component.types;
      addressTypes.forEach(type => {
        if (type === "sublocality_level_1") {
          location += `${component.long_name}, `;
        }
        if (type === "postal_town") {
          location += `${component.long_name}, `;
        }
        if (type === "administrative_area_level_1") {
          location += `${component.long_name}, `;
        }
        if (type === "country") {
          location += component.long_name;
        }
      });
    });
    // is it still empty ?
    if (location === "") {
      location = UNKNOWN_LOCATION;
    }
  }
  return location;
};

module.exports.hello = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Go Serverless v1.0! Your function executed successfully!",
      input: event
    })
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.whereIs = async event => {
  // ready queryStringParameter
  const query = event.queryStringParameters;
  if (!query) {
    return badRequest("Missing input parameters");
  }
  const params = {};
  if (query.lat || query.lng) {
    // if latlng : reverseGeocode
    console.log("reverse geocode with coordinates", query.lat, query.lng);
    params.latlng = `${query.lat},${query.lng}`;
  } else if (query.address) {
    // if address : geocode
    console.log("geocode with address", query.address);
    params.address = query.address;
  } else {
    return badRequest("Bad input parameters");
  }
  params.key = process.env.GOOGLE_API_KEY;
  try {
    const response = await geocodeGoogle(params);
    const result = {
      location: UNKNOWN_LOCATION
    };
    // console.log('200 response');
    if (response.data && response.data.results && response.data.results[0]) {
      const first = response.data.results[0];
      result.location = parseGoogleAddressComponents(first.address_components);
      if (first.formatted_address) {
        result.formatted_address = first.formatted_address;
      }
    }

    return success(result);
  } catch (err) {
    return badRequest(err);
  }
};
