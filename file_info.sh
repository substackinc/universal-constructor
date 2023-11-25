#!/bin/bash

# Check if a file path is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <file_path>"
    exit 1
fi

FILE_PATH=$1

# Display the content of the file
echo "$ cat "$FILE_PATH":"
cat "$FILE_PATH"
echo ""

# Show the git diff for the file
echo "$ git dif"$FILE_PATH":"
git diff "$FILE_PATH"
echo ""

# Show the last couple changes
echo "$ git log -n 3 --oneline "$FILE_PATH
git log -n 3 --oneline "$FILE_PATH"
echo ""

# Check if the file is formatted correctly with prettier
echo "$ prettier --check "$FILE_PATH":"
prettier --check "$FILE_PATH" 2>&1
echo ""

# End of script
exit 0
