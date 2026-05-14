import {
  CreateCustomerBodySchema,
  CustomerSchema,
  ListCustomersParametersSchema,
  PaginatedCustomersSchema,
  UpdateCustomerBodySchema,
  UpdateCustomerFieldsBodySchema,
  type CreateCustomerBody,
  type Customer,
  type ListCustomersParameters,
  type PaginatedCustomers,
  type UpdateCustomerBody,
  type UpdateCustomerFieldsBody
} from '../schema'
import { Transport, type CreatedResource } from './transport'

/** Client for FreeScout customer and customer-field operations. */
export class CustomersClient {
  /**
   * Creates a customers client that issues requests via the given shared transport.
   *
   * @param transport Shared FreeScout HTTP transport.
   */
  public constructor(private readonly transport: Transport) {}

  /**
   * Lists customers using FreeScout's customer filters and pagination options.
   *
   * @param parameters Optional customer filters and pagination settings.
   * @returns A paginated customer result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async list(parameters?: ListCustomersParameters): Promise<PaginatedCustomers> {
    const response = await this.transport.request({
      method: 'GET',
      path: '/customers',
      parameters: ListCustomersParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedCustomersSchema)
  }

  /**
   * Retrieves a full customer record by ID.
   *
   * @param customerId The FreeScout customer ID.
   * @returns The requested customer.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async get(customerId: number): Promise<Customer> {
    const response = await this.transport.request({
      method: 'GET',
      path: `/customers/${customerId}`
    })

    return this.transport.parseJSONResponse(response, CustomerSchema)
  }

  /**
   * Creates a new customer.
   *
   * FreeScout requires at least `firstName` or an email address. The returned `resourceId`
   * is populated from the `Resource-ID` response header when present.
   *
   * @param body The customer payload to send to FreeScout.
   * @returns The created customer and optional `Resource-ID` header value.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async create(body: CreateCustomerBody): Promise<CreatedResource<Customer>> {
    const response = await this.transport.request({
      method: 'POST',
      path: '/customers',
      body: CreateCustomerBodySchema.parse(body)
    })

    return {
      resourceId: this.transport.parseResourceId(response),
      data: await this.transport.parseJSONResponse(response, CustomerSchema)
    }
  }

  /**
   * Updates the subset of customer fields supported by the FreeScout API.
   *
   * @param customerId The FreeScout customer ID.
   * @param body The partial customer update payload.
   * @returns A promise that resolves when the update succeeds.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async update(customerId: number, body: UpdateCustomerBody): Promise<void> {
    await this.transport.request({
      method: 'PUT',
      path: `/customers/${customerId}`,
      body: UpdateCustomerBodySchema.parse(body)
    })
  }

  /**
   * Updates only the submitted customer field values.
   *
   * This endpoint requires the CRM module in FreeScout.
   *
   * @param customerId The FreeScout customer ID.
   * @param body The customer field values to update.
   * @returns A promise that resolves when the customer fields are updated.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async updateFields(customerId: number, body: UpdateCustomerFieldsBody): Promise<void> {
    await this.transport.request({
      method: 'PUT',
      path: `/customers/${customerId}/customer_fields`,
      body: UpdateCustomerFieldsBodySchema.parse(body)
    })
  }
}
