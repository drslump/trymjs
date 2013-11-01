#!/bin/bash

# Booi needs to output the assembly somewhere
export TMPDIR=~/tmp
mkdir $TMPDIR

export MONO_OPTS='--gc=boehm'

# Print out mono and Boo versions
mono $MONO_OPTS --version | head -1
mono $MONO_OPTS /opt/boo-alpha/booi.exe --version

# Configure timeout
export TIMEOUT_IDSTR=$'---------------\nSTATS: '
LIMIT_CPU=1
LIMIT_MEM=50000

# Process priority (from 0 to 20, 0 is highest)
NICE_LEVEL=15

echo "---------------"

nice -n $NICE_LEVEL \
./timeout -t $LIMIT_CPU -m $LIMIT_MEM \
mono $MONO_OPTS /opt/boo-alpha/booi.exe program.boo
echo "EXITCODE: $?"

#for i in {0..9}; do
#    echo "waiting to see if the process is terminated: $i"
#    sleep 1
#done
