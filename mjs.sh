#!/bin/bash

# Booi needs to output the assembly somewhere
#export TMPDIR=~/tmp
#mkdir $TMPDIR

export PATH="/usr/local/bin:$PATH"
export LANG=en_US.UTF-8

NODE_OPTS=
MJS=node_modules/meta-script/bin/mjs
MJS_OPTS=

# Print out mono and Boo versions
NODE_VERSION=`node --version | head -1`
MJS_VERSION=`$MJS --version | head -1`
echo "Metascript $MJS_VERSION -- Node $NODE_VERSION"
echo "-----------------------------------------"

NICE_LEVEL=15                   # Process priority (from 0 to 20, 0 is highest)
TIME_LIMIT=4s                   # Timeout for the process
VMEM_LIMIT=$(( 32 * 1024 ))     # Virtual Memory limit in kilobytes

ulimit -v $VMEM_LIMIT
nice -n $NICE_LEVEL \
  timeout $TIME_LIMIT \
  node $NODE_OPTS $MJS -o program.js program.mjs

status=$?

echo "<[({"
if [ $status -eq 0 ]; then
    cat program.js
fi
echo "})]>"

echo "EXITCODE: $status"
