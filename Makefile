PLANNERS = cse exhaustive-firsts schoolbus schoolbus-sliders

data/enum-lace-6: longer-laces.js
	./longer-laces.js

csvs:
	mkdir csvs
	
csvs/$(PLANNERS): $(PLANNERS).js
	./$(PLANNERS).js data/enum-lace-6
	./generate-stats.js results/$(PLANNERS)
		
clean:
	rm results/*
	rmdir results
	rm csvs/*
	rmdir csvs
	rmdir data/enum-lace-6

