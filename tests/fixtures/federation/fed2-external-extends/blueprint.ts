import { parse } from 'graphql';
import { buildBlueprintFromFederation } from '../../../../src/federation/blueprint.js';
import { supergraph } from './supergraph.js';

export const blueprint = buildBlueprintFromFederation(parse(supergraph));
