/**
 * selectBox.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log', './addToBox', './setBoxOrientation', './sortArray'],
  function (log, addToBox, setBoxOrientation, sortArray) {

    function select_box(itemFulfill, boxIdx) {
      log.debug({
        title: 'SELECTING BOX',
        details: 'Running select box'
      });
      // Converted original box obj to arr of obj
      var boxes = [
        {
          name: 'Membership',
          x: 8.25,
          y: 6,
          z: 2.5,
          cols: [{ x: 0, y: 0, z: 0 }],
          remaining_col_space: 8.25
        },
        {
          name: 'Membership Large',
          x: 11.25,
          y: 6,
          z: 2.5,
          cols: [{ x: 0, y: 0, z: 0 }],
          remaining_col_space: 11.25
        },
        {
          name: 'Square',
          x: 7,
          y: 7,
          z: 6,
          cols: [{ x: 0, y: 0, z: 0 }],
          remaining_col_space: 7
        },
        {
          name: 'MD Flat Rate',
          x: 11,
          y: 8.5,
          z: 5.5,
          cols: [{ x: 0, y: 0, z: 0 }],
          remaining_col_space: 11
        }
      ];

      // Get items
      var lines = itemFulfill.getLineCount({ sublistId: 'item' });
      var items = [];
      for (var i = 0; i < lines; i++) {
        var quantity = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
        var width = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_width', line: i });
        var depth = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_length', line: i });
        var height = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_height', line: i });
        // Add dimensions to item list (making sure to take account quantity)
        for (var q = 0; q < quantity; q++) {
          items.push([width, depth, height]);
        }
      }
      // Sort the items list
      var sorted_items = sortArray._sort(items);
      log.debug({
        title: 'SORTED ITEMS',
        details: JSON.stringify(sorted_items)
      });
      // var box = set_box_orientation(sorted_items[0], JSON.parse(JSON.stringify(boxes.membership)));
      var box = setBoxOrientation._set(sorted_items[0], JSON.parse(JSON.stringify(boxes[boxIdx])));
      sorted_items.sort(function (a, b) { a[2] - b[2] });
      sorted_items = sorted_items.reverse();
      for (var i = 0; i < sorted_items.length; i++) {
        if (box) {
          box = addToBox._add(sorted_items[i], box);
        } else {
          break;
        }
      }
      return box;
    }

    return {
      _select: select_box
    }
  });