import {
  CreateUserBodySchema,
  DeleteUserParametersSchema,
  ListUsersParametersSchema,
  PaginatedUsersSchema,
  UserSchema,
  type CreateUserBody,
  type DeleteUserParameters,
  type ListUsersParameters,
  type PaginatedUsers,
  type User
} from '../schema'
import { Transport, type CreatedResource } from './transport'

/** Client for FreeScout user operations. */
export class UsersClient {
  /**
   * Creates a users client that issues requests via the given shared transport.
   *
   * @param transport Shared FreeScout HTTP transport.
   */
  public constructor(private readonly transport: Transport) {}

  /**
   * Lists users with optional exact email filtering and pagination.
   *
   * @param parameters Optional user filters and pagination settings.
   * @returns A paginated user result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async list(parameters?: ListUsersParameters): Promise<PaginatedUsers> {
    const response = await this.transport.request({
      method: 'GET',
      path: '/users',
      parameters: ListUsersParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedUsersSchema)
  }

  /**
   * Retrieves a full user record by ID.
   *
   * @param userId The FreeScout user ID.
   * @returns The requested user.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async get(userId: number): Promise<User> {
    const response = await this.transport.request({
      method: 'GET',
      path: `/users/${userId}`
    })

    return this.transport.parseJSONResponse(response, UserSchema)
  }

  /**
   * Creates a regular FreeScout user.
   *
   * The API ignores any incoming role value and does not automatically grant mailbox access.
   * The returned `resourceId` is populated from the `Resource-ID` response header when present.
   *
   * @param body The user payload to send to FreeScout.
   * @returns The created user and optional `Resource-ID` header value.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async create(body: CreateUserBody): Promise<CreatedResource<User>> {
    const response = await this.transport.request({
      method: 'POST',
      path: '/users',
      body: CreateUserBodySchema.parse(body)
    })

    return {
      resourceId: this.transport.parseResourceId(response),
      data: await this.transport.parseJSONResponse(response, UserSchema)
    }
  }

  /**
   * Deletes a user.
   *
   * FreeScout requires `byUserId` and may also require mailbox-specific reassignment parameters.
   *
   * @param userId The FreeScout user ID.
   * @param parameters The deletion parameters, including the acting user ID.
   * @returns A promise that resolves when the user is deleted.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async delete(userId: number, parameters: DeleteUserParameters): Promise<void> {
    await this.transport.request({
      method: 'DELETE',
      path: `/users/${userId}`,
      parameters: DeleteUserParametersSchema.parse(parameters)
    })
  }
}
