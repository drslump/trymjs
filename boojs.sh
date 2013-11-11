#!/bin/bash

# Booi needs to output the assembly somewhere
export TMPDIR=~/tmp
mkdir $TMPDIR

export PATH="/opt/mono/bin:$PATH"
export LANG=en_US.UTF-8
export MONO_OPTS='--gc=boehm'

BOOJS=/opt/boojs/boojs.exe

# Print out mono and Boo versions
MONO_VERSION=`mono $MONO_OPTS --version | head -1`
BOOJS_VERSION=0.0.1
echo "$BOOJS_VERSION -- $MONO_VERSION"
echo "---------------"

NICE_LEVEL=15                   # Process priority (from 0 to 20, 0 is highest)
TIME_LIMIT=4s                   # Timeout for the process
VMEM_LIMIT=$(( 75 * 1024 ))     # Virtual Memory limit in kilobytes

ulimit -v $VMEM_LIMIT
nice -n $NICE_LEVEL \
  timeout $TIME_LIMIT \
  mono $MONO_OPTS $BOOJS -debug+ -embedasm- -sourcemap:out.map -o:program.js program.boo

status=$?

echo "<[({"
if [ $status -eq 0 ]; then
    cat program.js
fi
echo "})]>"

echo "EXITCODE: $status"
