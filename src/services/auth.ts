import { inject, injectable } from 'inversify';

import type User from '@models/user';

import type UserAuthRequest from '@requests/user.auth';
import ActivityRepository from '@repository/activity';
import ActivityRepositoryInterface from '@repository/activity.interface';
import UserRepository from '@repository/user';
import UserRepositoryInterface from '@repository/user.interface';

import { type OAuthProfile } from '@auth';

import GenericError from '@errors/generic.error';
import ValidationError from '@errors/validation.error';

import matchPassword from '@utils/user-password/compare';
import getToken from '@utils/user-password/token';

import { Activities } from './activity.types';
import { type AuthResponseInterface, type UserDataResponseInterface } from './auth.types';

import { StatusCodes } from 'http-status-codes';

@injectable()

export default class AuthService {
  private readonly userRepository: UserRepositoryInterface;
  private readonly activityRepository: ActivityRepositoryInterface;

  constructor (@inject(UserRepository) userRepository?: UserRepositoryInterface, @inject(ActivityRepository) activityRepository?: ActivityRepositoryInterface) {
    this.userRepository = userRepository;
    this.activityRepository = activityRepository;
  }

  public async authenticateWithPassword (data: UserAuthRequest): Promise<UserDataResponseInterface> {
    const { email, password } = data;

    const user = await this.userRepository.findUserByEmail(email);

    if (!user) throw new ValidationError(`User not found`, [`email`]);

    if (user.password === null) throw new ValidationError(`The user does not have a registered password`, [`password`]);

    if (!matchPassword(password, user.password)) throw new ValidationError(`Wrong user password`, [`password`]);

    await this.activityRepository.create(user, Activities.LOGIN_WITH_PASSWORD);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      token: getToken(user)
    };
  }

  public async authenticateWithOAuthProfile (profile: OAuthProfile): Promise<AuthResponseInterface> {
    let user = await this.userRepository.findUserByEmail(profile.email);

    if (user === null) {
      user = await this.userRepository.create({
        name: profile.name,
        email: profile.email,
        picture: profile.picture || null
      });
    } else if (user.picture === null && profile.picture) {
      user = await this.userRepository.update(user, { picture: profile.picture });
    }

    await this.activityRepository.create(user, Activities.LOGIN_WITH_PROVIDER.replace(`@provider`, profile.provider));

    return {
      action: `auth`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        token: getToken(user)
      }
    };
  }

  public async verifyUserByIdAndPassword (id: number, password: string | null): Promise<User> {
    const user = await this.userRepository.findUserById(id);

    if (!user) throw new GenericError(`User not found`, StatusCodes.UNAUTHORIZED);

    if (user.password !== password) throw new GenericError(`Wrong user password`, StatusCodes.UNAUTHORIZED);

    return user;
  }

  public async check (user: User): Promise<Omit<UserDataResponseInterface, "token">> {
    return await Promise.resolve({
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture
    });
  }

  public error (): { error: string } {
    return {
      error: `Could not complete the authentication`
    };
  }
}
