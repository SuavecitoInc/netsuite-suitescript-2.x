/**
 * sortArray.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log'],
  function (log) {

    function sort_array(arr) {
      var sorted_arr = arr;
      for (var i = 0; i < sorted_arr.length; i++) {
        sorted_arr[i].sort(function (a, b) { a - b });
        sorted_arr[i] = sorted_arr[i].reverse();
      }
      sorted_arr.sort(function (a, b) { a[0] - b[0] });
      sorted_arr = sorted_arr.reverse();

      if (sorted_arr.length > 1) {
        var tall_items = [];
        var short_items = [];
        for (var i = 0; i < sorted_arr.length; i++) {
          if (sorted_arr[i][2] <= 0.25) {
            // const spliced = sorted_arr.splice(i,1)
            // sorted_arr = sorted_arr.concat(spliced)
            // i = i - 1
            short_items.push(sorted_arr[i]);
          } else {
            tall_items.push(sorted_arr[i]);
          }
        }
        sorted_arr = tall_items.concat(short_items);
      }
      return sorted_arr;
    }

    return {
      _sort: sort_array
    }
  });