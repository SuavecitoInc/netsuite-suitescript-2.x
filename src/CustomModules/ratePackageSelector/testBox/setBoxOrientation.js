/**
 * setBoxOrientation.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log'],
  function (log) {

    function set_box_orientation(largest_product, box) {
      // Make a copy
      var oriented_box = JSON.parse(JSON.stringify(box));
      if (largest_product[0] > oriented_box.y) {
        // Turn the box
        var x = oriented_box.y;
        var y = oriented_box.x;
        oriented_box.x = x;
        oriented_box.y = y;
        oriented_box.remaining_col_space = x;
      }
      return oriented_box;
    }

    return {
      _set: set_box_orientation
    }
  });