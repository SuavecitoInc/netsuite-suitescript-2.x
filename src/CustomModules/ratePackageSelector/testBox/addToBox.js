/**
 * addToBox.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log'],
  function (log) {

    function add_to_box(product, box) {
      // Turn product if it is greater than y
      // This should only happen if the item height is < 0.25
      if (product[0] > box.y) {
        var shifted = product.shift();
        product[2] = product[1];
        product[1] = shifted;
      }
      master_loop:
      for (var i = 0; i < box.cols.length; i++) {
        var col = box.cols[i];
        // Column isn't empty, there is enough y space and x space
        //////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////
        if (col.x && box.y - col.y >= product[0] && col.x <= product[1]) {
          col.y += product[0];
          if (col.z < product[2]) col.z = product[2];
          break master_loop;
          // If the column is empty (new box)
          ////////////////////////////////////////////////////////////
          /////////////////////////////////////////////////////////////
          ///////////////////////////////////////////////////////////////
        } else if (!col.x && product[1] <= box.remaining_col_space) {
          log.debug({
            title: 'ADDING ITEM TO NEW BOX',
            details: JSON.stringify(product[1])
          });
          col.y = product[0];
          col.x = product[1];
          col.z = product[2];
          box.remaining_col_space -= product[1];
          break master_loop;
          // If on the last column and there is enough space for a new column
          ////////////////////////////////////////////////////////////////////
          ////////////////////////////////////////////////////////////////////
          ////////////////////////////////////////////////////////////////////
        } else if (i + 1 === box.cols.length && box.remaining_col_space >= product[1]) {
          box.cols.push({ x: product[1], y: product[0], z: product[2] });
          box.remaining_col_space -= product[1];
          break master_loop;
          // If on the last column and there isn't enough space for a new column
          /////////////////////////////////////////////////////////////////////////
          ///////////////////////////////////////////////////////////////////////////
          ///////////////////////////////////////////////////////////////////////////
        } else if (i + 1 === box.cols.length && box.remaining_col_space < product[1]) {
          // Look for vertical space
          starting_column:
          for (var s = 0; s < box.cols.length; s++) {
            var combined_x = 0;
            // If there is enough z to stack in col s
            /////////////////////////////////////////////////////
            /////////////////////////////////////////////////////
            if (box.z - box.cols[s].z >= product[2]) {
              //if there is enough x to stack in col s
              if (box.cols[s].x >= product[1]) {
                box.cols[s].z += product[2]
                break master_loop;
                // Try combining column space
                // If not on last column
                /////////////////////////////////////////
                /////////////////////////////////////////
              } else if (s + 1 !== box.cols.length) {
                combined_x += box.cols[s].x;
                ending_column:
                for (var e = s + 1; e < box.cols.length; e++) {
                  // If remaining col height > that product height
                  //////////////////////////////////////////////
                  if (box.z - box.cols[e].z >= product[2]) {
                    combined_x += box.cols[e].x;
                    if (combined_x >= product[1]) {
                      for (var f = s; f <= e; f++) {
                        box.cols[f].z += product[2];
                      }
                      break master_loop;
                      // If ending column is on last loop
                      //////////////////////////////////
                      //////////////////////////////////
                    } else if (e + 1 === box.cols.length) {
                      // If there is unallocated space in the box
                      //////////////////////////////////////////
                      if (combined_x + box.remaining_col_space >= product[1]) {
                        for (var a = 0; a < box.cols.length; a++) {
                          box.cols[a].z += product[2];
                        }
                        var new_col_x = product[1] - combined_x;
                        box.cols.push({ x: new_col_x, y: product[0], z: product[2] });
                        box.remaining_col_space -= new_col_x;
                        break master_loop;
                      } else {
                        break ending_column;
                      }
                    } else {
                      log.debug({
                        title: 'CONTINUE TO ending_column ' + e + 1,
                        details: 'Jump past ' + e
                      });
                    }
                    // Jump past e
                  } else {
                    s = e + 1;
                    break ending_column;
                  }
                }
              } else {
                // If only one column exists, and there is space left
                if (box.cols.length == 1 && box.cols[s].x + box.remaining_col_space >= product[1]) {
                  var new_col_x = product[1] - box.cols[s].x;
                  box.cols.push({ x: new_col_x, y: product[0], z: product[2] });
                  box.cols[s].z += product[2];
                  box.remaining_col_space -= new_col_x;
                  break master_loop;
                } else {
                  box = false;
                  break master_loop;
                }
              }
            } else if (s + 1 == box.cols.length) {
              box = false;
              break master_loop;
            }
          }
        }
      }
      return box;
    }

    return {
      _add: add_to_box
    }
  });