# transfer-plan-supplement

## Transfer Plans
The transfer planning algorithms cse, schoolbus, schoolbus-sliders, and exhaustive-firsts (exhaustive search with firsts) all take in the transfer problem as a .xfer file and produce a .xout file. The format of the .xfer file is json format where the field "transferMax" is the maximum change in racking allowed, and the fields "offsets" and "firsts" are lists of the same length where each index corresponds to a specific loop. Offsets represent that loop's target offset and firsts represent whether a given loop is marked to arrive first. There is an additional field "order" represents the order of any loop crossings, which is not supported by the existing algorithms. The generated .xout files contain the original transfer problem in the header and the resulting plan, where each line contains a transfer instruction. 

## Lace Examples
