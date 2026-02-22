# CI Pipeline — Design Document Overview

A personal, lightweight CI pipeline built with Bun. Serial execution to start, designed for a homeserver. Learning project.

## Orchestrator

The central piece. Responsible for:

Reading and parsing the pipeline definition from a YAML file
Managing job lifecycle in serial order
Enforcing timeouts per job
Deciding pipeline fate on job failure (fail-fast)

The sequence and order of jobs is derived directly from the YAML definition.

## Pipeline Definition (YAML)

Each pipeline is described in a YAML file. It defines the pipeline name and the ordered list of jobs.

## Jobs

Each job runs as a subprocess. It has:

Its own writable stream for stdout and stderr
A timeout (default or overridden per job in the YAML)
An onExit handler for cleanup, always runs regardless of success or failure

## Timeouts

Each job has a timeout
Sensible defaults for now, overridable per job in YAML
Two distinct failure modes:

Job exceeds its total allowed runtime
Job goes silent (missed heartbeats)

Both are handled by the orchestrator

## IPC — Job to Orchestrator Communication

Jobs communicate with the orchestrator via IPC. Three signal types:

Started — job has begun execution
Heartbeat — job is alive, sent at a regular interval by the job itself. Silence implies the job is stuck
Exit — job has finished, includes exit code and exit reason (normal exit vs signal kill)

The orchestrator is the decision maker. Jobs only report — they never control the pipeline.

## Logging

One folder per pipeline run, named [date]-[pipeline-name]
One log file per job within that folder
Plain text format for now
Job order is known from the YAML definition

## Failure Behavior

Fail-fast: if any job fails, the pipeline stops immediately
Remaining jobs do not run
This will need revisiting when parallel execution is introduced
