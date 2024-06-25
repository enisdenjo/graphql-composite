import { parse } from 'graphql';
import { buildBlueprintFromFederation } from '../../../../src/index.js';
import { supergraph } from './supergraph.js';

export const blueprint = buildBlueprintFromFederation(parse(supergraph));
