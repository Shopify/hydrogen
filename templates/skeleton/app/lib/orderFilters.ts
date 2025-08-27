/**
 * Parameters for filtering customer orders
 */
export interface OrderFilterParams {
  /** Order name or number (e.g., "#1001" or "1001") */
  name?: string;
  /** Order confirmation number */
  confirmationNumber?: string;
}

/**
 * Builds a query string for filtering customer orders using the Customer Account API
 * @param filters - The filter parameters
 * @returns A formatted query string for the GraphQL query parameter, or undefined if no filters
 * @example
 * buildOrderSearchQuery({ name: '1001' }) // returns "name:1001"
 * buildOrderSearchQuery({ name: '1001', confirmationNumber: 'ABC123' }) // returns "name:1001 AND confirmation_number:ABC123"
 */
export function buildOrderSearchQuery(filters: OrderFilterParams): string | undefined {
  const queryParts: string[] = [];

  if (filters.name) {
    // Remove # if present and trim
    const cleanName = filters.name.replace(/^#/, '').trim();
    if (cleanName) {
      queryParts.push(`name:${cleanName}`);
    }
  }

  if (filters.confirmationNumber) {
    const cleanConfirmation = filters.confirmationNumber.trim();
    if (cleanConfirmation) {
      queryParts.push(`confirmation_number:${cleanConfirmation}`);
    }
  }

  return queryParts.length > 0 ? queryParts.join(' AND ') : undefined;
}

/**
 * Parses order filter parameters from URLSearchParams
 * @param searchParams - The URL search parameters
 * @returns Parsed filter parameters
 * @example
 * const url = new URL('https://example.com/orders?name=1001&confirmation_number=ABC123');
 * parseOrderFilters(url.searchParams) // returns { name: '1001', confirmationNumber: 'ABC123' }
 */
export function parseOrderFilters(searchParams: URLSearchParams): OrderFilterParams {
  const filters: OrderFilterParams = {};

  const name = searchParams.get('name');
  if (name) {
    filters.name = name;
  }

  const confirmationNumber = searchParams.get('confirmation_number');
  if (confirmationNumber) {
    filters.confirmationNumber = confirmationNumber;
  }

  return filters;
}