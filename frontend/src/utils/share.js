export async function shareRestaurant(restaurant) {
  const url = `${window.location.origin}/restaurants/${restaurant._id}`;
  const data = {
    title: restaurant.name,
    text: `Check out ${restaurant.name} (${restaurant.cuisine}) on L'Étoile Reserve — ${restaurant.rating}★ in ${restaurant.location}`,
    url
  };

  if (navigator.share) {
    try {
      await navigator.share(data);
      return { ok: true, method: 'native' };
    } catch (err) {
      if (err.name === 'AbortError') return { ok: false, method: 'cancelled' };
    }
  }

  try {
    await navigator.clipboard.writeText(`${data.text}\n${url}`);
    return { ok: true, method: 'clipboard' };
  } catch {
    return { ok: false, method: 'failed', url };
  }
}
