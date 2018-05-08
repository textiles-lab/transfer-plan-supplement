# transfer-plan-supplement
Latest version may be found at (https://github.com/textiles-lab/transfer-plan-supplement).

## Transfer Plans
The transfer planning algorithms cse, schoolbus, schoolbus-sliders, and exhaustive-firsts (exhaustive search with firsts) all take in the transfer problem as a .xfer file and produce a .xout file. The format of the .xfer file is json format where the field "transferMax" is the maximum change in racking allowed, and the fields "offsets" and "firsts" are lists of the same length where each index corresponds to a specific loop. Offsets represent that loop's target offset and firsts represent whether a given loop is marked to arrive first. There is an additional field "order" represents the order of any loop crossings, which is not supported by the existing algorithms. The generated .xout files contain the original transfer problem in the header and the resulting plan, where each line contains a transfer instruction. Running ./generate-stats.js on a directory of .xout will calculate the number of passes used, the lower bound on passes for that problem, and other statistics, and compile them into a csv.

You can view a transfer plan (.xout file) with animation by using the included `flat-transfers.html`, or call `node flat-transfer-visualizer.js` from the command line to create SVG files of the plan.

## Creating Laces
Also included is make-lace.html, a visual tool for making laces. It reads and writes .lace files, which encode both the knitting information and the transfer problem as an offset formulation. In make-lace.html, you drag stitches to create stacks, click on a given stitch to send it to the front of a stack, and right click to toggle between knit and purl. The resulting .lace file can then be passed to lace-to-knitout.js, which will create a knitout file using the transfer plan passed in as a parameter. For information on the knitout specification, see (https://textiles-lab.github.io/knitout/knitout.html).
