import { setMap } from "./map.js?v1";
// globals
export const state = {
    map: null,
    projection: null,
    path: null,
    colorScale: null,
    healthByCounty: null,
    attrArray: null,
    expressed: null,
    tooltip: null,
    isRatioField: false,
  };
  
(function () { 
    //run it
    window.onload = setMap;

})(); //end of self-executing anonymous function
