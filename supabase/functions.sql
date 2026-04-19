-- Run this in Supabase SQL Editor after schema.sql

create or replace function public.update_game_state(
  p_user_id uuid,
  p_points_delta integer,
  p_health_delta integer,
  p_week_number integer
) returns void as $$
begin
  insert into public.game_state (user_id, points, city_health, week_number)
  values (p_user_id, greatest(0, p_points_delta), greatest(0, least(100, 100 + p_health_delta)), p_week_number)
  on conflict (user_id) do update set
    points = greatest(0, game_state.points + p_points_delta),
    city_health = greatest(0, least(100, game_state.city_health + p_health_delta)),
    week_number = p_week_number,
    updated_at = now();
end;
$$ language plpgsql security definer;
