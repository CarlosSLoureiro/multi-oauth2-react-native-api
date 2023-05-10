import User from "@models/user";

import { Sequelize } from "sequelize";

export default class Database {
  private sequelize: Sequelize;

  public async config (): Promise<void> {
    this.sequelize = new Sequelize(process.env.MYSQL_BASE, process.env.MYSQL_USER, process.env.MYSQL_PASS, {
      host: process.env.MYSQL_HOST,
      dialect: `mysql`
    });

    const models = [User];

    models.forEach(model => { model.initialize(this.sequelize); });

    try {
      await this.sequelize.sync({ force: false });
      console.log(`\x1b[32m`, `Successfully connected to the Database!`, `\x1b[0m`);
    } catch (e) {
      console.log(e);
      console.log(`\x1b[31m`, `Failed to connect to the Database!`, `\x1b[0m`);
    }
  }
}
