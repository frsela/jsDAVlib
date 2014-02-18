
all: clean
	@echo "Preparing test application"
	@git submodule update --init --recursive
	@cp -al src/ test/js/lib

clean:
	@echo "Cleaning ..."
	@rm -rf test/js/lib
	@rm -f jsDAVlib.zip

app: all
	@echo "Creating package ..."
	@cd test; zip -r ../jsDAVlib.zip *
