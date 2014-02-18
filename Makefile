
all: clean
	@echo "Preparing test application"
	@git submodule update --init --recursive
	@cp -al src/ test/js/lib

clean:
	@echo "Cleaning ..."
	@rm -rf test/js/lib
