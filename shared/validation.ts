import { z } from 'zod';
export const decisionSchema=z.object({
 explanation:z.string().min(1).max(280),
 diplomaticActions:z.array(z.object({type:z.enum(['message','propose_alliance','accept','reject','ultimatum','guarantee','request_access','declare_war','offer_peace','demand_territory','ceasefire','break_treaty']),target:z.string().max(20),message:z.string().max(240).optional(),proposalId:z.string().max(50).optional(),region:z.string().max(50).optional()}).strict()).max(2),
 militaryActions:z.array(z.object({type:z.enum(['move','attack','defend','retreat','reinforce','entrench','merge','split']),armyId:z.string().max(60),targetRegion:z.string().max(50).optional(),otherArmyId:z.string().max(60).optional()}).strict()).max(3),
 economicActions:z.array(z.object({type:z.literal('recruit'),region:z.string().max(50),amount:z.number().int().min(1).max(2)}).strict()).max(1)
}).strict();
export const settingsSchema=z.object({model:z.string().regex(/^@cf\/[a-z0-9.-]+\/[a-z0-9.-]+$/).max(100),llmCountries:z.array(z.string().max(10)).max(22),callBudget:z.number().int().min(0).max(5),maxTokens:z.number().int().min(250).max(1200)}).strict();
