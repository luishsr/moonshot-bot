import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  RPC_URL: Joi.string().required(),
  FEE_WALLET: Joi.string().required(),
}).unknown();

const { value: config, error } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export { config };