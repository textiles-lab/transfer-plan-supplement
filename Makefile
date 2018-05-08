#PLANNERS = cse exhaustive-firsts schoolbus schoolbus-sliders
all: gen_laces cse  sb sbb opt stats

gen_laces: longer-laces.js
	./longer-laces.js

csvs:
	mkdir csvs

cse: cse.js
	./cse.js data/enum-laces-6

opt: exhaustive-firsts.js
	./exhaustive-firsts.js data/enum-laces-6

sb: schoolbus.js
	./schoolbus.js data/enum-laces-6

sbb:
	./schoolbus-sliders.js data/enum-laces-6

stats: generate-stats.js
	./generate-stats.js results/cse
	./generate-stats.js results/exhaustive-firsts
	./generate-stats.js results/schoolbus
	./generate-stats.js results/schoolbus-sliders

#$(PLANNERS): $(PLANNERS).js
#	./$(PLANNERS).js data/enum-lace-6
	#./generate-stats.js results/$(PLANNERS)
		
clean:
	rm results/*
	rmdir results
	rm csvs/*
	rmdir csvs
	rmdir data/enum-lace-6

