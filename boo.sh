#!/bin/bash

# Booi needs to output the assembly somewhere
export TMPDIR=~/tmp
mkdir $TMPDIR

export PATH="/opt/mono/bin:$PATH"
export LANG=en_US.UTF-8
export MONO_OPTS='--gc=boehm'

BOOI=/opt/boo-alpha/booi.exe

# Print out mono and Boo versions
MONO_VERSION=`mono $MONO_OPTS --version | head -1`
BOOI_VERSION=`mono $MONO_OPTS $BOOI --version`
echo "$BOOI_VERSION -- $MONO_VERSION"
echo "---------------"

NICE_LEVEL=15                   # Process priority (from 0 to 20, 0 is highest)
TIME_LIMIT=4s                   # Timeout for the process
VMEM_LIMIT=$(( 75 * 1024 ))     # Virtual Memory limit in kilobytes

ulimit -v $VMEM_LIMIT
nice -n $NICE_LEVEL \
  timeout $TIME_LIMIT \
  mono $MONO_OPTS $BOOI program.boo

echo "EXITCODE: $?"
