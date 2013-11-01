#!/bin/bash

# Booi needs to output the assembly somewhere
export TMPDIR=~/tmp
mkdir $TMPDIR

export MONO_OPTS='--gc=boehm'

# Print out mono and Boo versions
mono $MONO_OPTS --version | head -1
#mono $MONO_OPTS /opt/boojs/boojs.exe --version

# Configure timeout
export TIMEOUT_IDSTR=$'---------------\nSTATS: '
LIMIT_CPU=3
LIMIT_MEM=50000

# Process priority (from 0 to 20, 0 is highest)
NICE_LEVEL=15

echo "---------------"

nice -n $NICE_LEVEL \
./timeout -t $LIMIT_CPU -m $LIMIT_MEM \
mono $MONO_OPTS /opt/boojs/boojs.exe -debug+ -embedasm- -sourcemap:out.map -o:program.js program.boo

status=$?

echo "<[({"
if [ $status -eq 0 ]; then
    cat program.js
fi
echo "})]>"

echo "EXITCODE: $?"
