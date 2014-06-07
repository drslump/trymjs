#!/bin/bash

function json(){
  python -c 'import json,sys; print json.dumps(sys.stdin.read())';
}

export TMPDIR=~/tmp
mkdir $TMPDIR

export PATH="/usr/local/bin:$PATH"
export LANG=en_US.UTF-8

NODE=/usr/local/bin/node
NODE_OPTS=
MJS="$NODE $NODE_OPTS /opt/metascript/bin/mjs"
MJS_OPTS=

# Print out mono and Boo versions
NODE_VERSION=`$NODE --version | head -1`
MJS_VERSION=`$MJS --version | head -1`

NICE_LEVEL=15                   # Process priority (from 0 to 20, 0 is highest)
TIME_LIMIT=4s                   # Timeout for the process
# WTF! Node needs a minimum of 768Mb of address space
VMEM_LIMIT=$(( 768 * 1024 ))    # Virtual Memory limit in kilobytes

ulimit -v $VMEM_LIMIT
time_start=`date +%s%6N`
nice -n $NICE_LEVEL \
  timeout $TIME_LIMIT \
  $MJS $MJS_OPTS -o program.js program.mjs
time_stop=`date +%s%6N`

status=$?

echo "{"
echo " \"status\": $status,"
if [ $status -eq 0 ]; then
echo " \"js\": $(cat program.js | json),"
fi
echo " \"node-version\": \"$NODE_VERSION\","
echo " \"mjs-version\": \"$MJS_VERSION\","
echo " \"time\": $((time_stop - time_start))"
echo "}"