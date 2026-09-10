const GATEWAY_URL = "http://localhost:8080";

const STAKEHOLDERS_URL = GATEWAY_URL;
const BLOG_URL = GATEWAY_URL;

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: "tourist" | "guide";
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  token: string;
}

export interface Profile {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  bio: string;
  motto: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface Blog {
  id: string;
  authorId: number;
  authorName: string;
  title: string;
  description: string;
  images: string[];
  createdAt: string;
}

async function handle<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Request failed");
  }
  return result;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${STAKEHOLDERS_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(response);
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${STAKEHOLDERS_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(response);
}

export async function getProfile(token: string): Promise<Profile> {
  const response = await fetch(`${STAKEHOLDERS_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function followUser(token: string, userId: number): Promise<{ status: string }> {
  const response = await fetch(`${STAKEHOLDERS_URL}/users/${userId}/follow`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function isFollowing(token: string, userId: number): Promise<{ following: boolean }> {
  const response = await fetch(`${STAKEHOLDERS_URL}/users/${userId}/following`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function listBlogs(): Promise<Blog[]> {
  const response = await fetch(`${BLOG_URL}/blogs`);
  return handle(response);
}

export async function createBlog(
  token: string,
  title: string,
  description: string,
  images: string[]
): Promise<{ id: string }> {
  const response = await fetch(`${BLOG_URL}/blogs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, images }),
  });
  return handle(response);
}

export async function createComment(
  token: string,
  blogId: string,
  content: string
): Promise<{ id: string }> {
  const response = await fetch(`${BLOG_URL}/blogs/${blogId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  return handle(response);
}

const TOUR_URL = GATEWAY_URL;

export type Difficulty = "easy" | "moderate" | "hard";
export type TourStatus = "draft" | "published" | "archived";

export interface KeyPoint {
  id?: string;
  name: string;
  description: string;
  image: string;
  latitude: number;
  longitude: number;
}

export interface Tour {
  id: string;
  authorId: number;
  authorName: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  status: TourStatus;
  price: number;
  startPoint: KeyPoint | null;
  endPoint: KeyPoint | null;
  createdAt: string;
}

export interface CreateTourData {
  name: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  durationMinutes: number;
  images: string[];
}

export async function createTour(
  token: string,
  data: CreateTourData
): Promise<{ id: string }> {
  const response = await fetch(`${TOUR_URL}/tours`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handle(response);
}

export async function listMyTours(token: string): Promise<Tour[]> {
  const response = await fetch(`${TOUR_URL}/tours/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export interface KeyPointFormData {
  name: string;
  description: string;
  image: string;
  latitude: number;
  longitude: number;
}

export async function getTour(token: string, tourId: string): Promise<Tour> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function setStartPoint(
  token: string,
  tourId: string,
  data: KeyPointFormData
): Promise<KeyPoint> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/startpoint`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handle(response);
}

export async function setEndPoint(
  token: string,
  tourId: string,
  data: KeyPointFormData
): Promise<KeyPoint> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/endpoint`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handle(response);
}
 
export interface PublicTour {
  id: string;
  authorId: number;
  authorName: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  status: TourStatus;
  price: number;
  durationMinutes: number;
  images: string[];
  startPoint: KeyPoint | null;
  endPoint: KeyPoint | null;
  createdAt: string;
}

 
export interface PublicTourSummary {
  id: string;
  authorName: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  price: number;
  durationMinutes: number;
  images: string[];
  startPoint: KeyPoint | null;
  createdAt: string;
}

export async function listPublishedTours(): Promise<PublicTourSummary[]> {
  const response = await fetch(`${TOUR_URL}/tours`);
  return handle(response);
}

export async function getPublicTour(tourId: string, token?: string | null): Promise<PublicTour> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/public`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return handle(response);
}

const PURCHASE_URL = GATEWAY_URL;

export interface OrderItem {
  id: string;
  tourId: string;
  tourName: string;
  price: number;
}

export interface ShoppingCart {
  id: string;
  touristId: number;
  items: OrderItem[];
  totalPrice: number;
  updatedAt: string;
}

export interface TourPurchaseToken {
  id: string;
  touristId: number;
  tourId: string;
  tourName: string;
  price: number;
  token: string;
  createdAt: string;
}

export interface CheckoutResult {
  status: string;
  tokens: TourPurchaseToken[];
}

export async function getCart(token: string): Promise<ShoppingCart> {
  const response = await fetch(`${PURCHASE_URL}/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function addToCart(token: string, tourId: string): Promise<ShoppingCart> {
  const response = await fetch(`${PURCHASE_URL}/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tourId }),
  });
  return handle(response);
}

export async function removeFromCart(token: string, tourId: string): Promise<ShoppingCart> {
  const response = await fetch(`${PURCHASE_URL}/cart/items/${tourId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function checkout(token: string): Promise<CheckoutResult> {
  const response = await fetch(`${PURCHASE_URL}/cart/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function checkPurchased(
  token: string,
  tourId: string
): Promise<{ purchased: boolean }> {
  const response = await fetch(`${PURCHASE_URL}/purchases/check/${tourId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}
 
export interface TouristPosition {
  latitude: number;
  longitude: number;
}

export async function getCurrentPosition(token: string): Promise<TouristPosition | null> {
  const response = await fetch(`${STAKEHOLDERS_URL}/position`, {
    headers: { Authorization: `Bearer ${token}` },
  });

   if (response.status === 204) {
    return null;
  }

  return handle(response);
}

export function formatPrice(price: number): string {
  return `${price} RSD`;
}

export async function setCurrentPosition(
  token: string,
  data: TouristPosition
): Promise<{ status: string }> {
  const response = await fetch(`${STAKEHOLDERS_URL}/position`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handle(response);
}

export async function setTourPrice(
  token: string,
  tourId: string,
  price: number
): Promise<{ status: string; price: number }> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/price`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ price }),
  });
  return handle(response);
}

export async function publishTour(
  token: string,
  tourId: string
): Promise<{ status: string }> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/publish`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function archiveTour(
  token: string,
  tourId: string
): Promise<{ status: string }> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/archive`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export interface PurchaseInfo {
  id: string;
  name: string;
  description: string;
  status: TourStatus;
  price: number;
}

export async function getPurchaseInfo(tourId: string): Promise<PurchaseInfo> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/purchase-info`);
  return handle(response);
}

 
export interface CompletedPoint {
  pointType: "startPoint" | "endPoint";
  name: string;
  completedAt: string;
}

export interface TourExecution {
  id: string;
  tourId: string;
  touristId: number;
  status: "active" | "completed" | "abandoned";
  startLatitude: number;
  startLongitude: number;
  completedPoints: CompletedPoint[];
  startedAt: string;
  endedAt: string | null;
  lastActivity: string;
}

export async function startExecution(
  token: string,
  tourId: string,
  data: TouristPosition
): Promise<{ id: string }> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/execution/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handle(response);
}

export async function getActiveExecution(
  token: string,
  tourId: string
): Promise<TourExecution | null> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/execution`, {
    headers: { Authorization: `Bearer ${token}` },
  });

   if (response.status === 204) {
    return null;
  }

  return handle(response);
}

export interface ProximityResult {
  newlyCompleted: string[];
  completedPoints: CompletedPoint[];
  lastActivity: string;
}

export async function checkProximity(
  token: string,
  tourId: string,
  data: TouristPosition
): Promise<ProximityResult> {
  const response = await fetch(
    `${TOUR_URL}/tours/${tourId}/execution/check-proximity`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }
  );
  return handle(response);
}

export async function completeExecution(
  token: string,
  tourId: string
): Promise<{ status: string }> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/execution/complete`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function abandonExecution(
  token: string,
  tourId: string
): Promise<{ status: string }> {
  const response = await fetch(`${TOUR_URL}/tours/${tourId}/execution/abandon`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}

export async function listMyPurchases(token: string): Promise<TourPurchaseToken[]> {
  const response = await fetch(`${PURCHASE_URL}/purchases/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(response);
}