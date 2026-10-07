import "server-only";
import { errors } from "@/shared/errors/app-error";

export interface PrivateFileStorageProvider { put(): Promise<never>; getSignedReadUrl(): Promise<never>; }
export interface StaticMapProvider { renderPlanningMap(): Promise<never>; }
export const unconfiguredFileStorageProvider: PrivateFileStorageProvider = { async put() { throw errors.providerNotConfigured(); }, async getSignedReadUrl() { throw errors.providerNotConfigured(); } };
export const unconfiguredStaticMapProvider: StaticMapProvider = { async renderPlanningMap() { throw errors.providerNotConfigured(); } };
